/*!
 * Brichaus UI Kit — <bui-choice-group> + <bui-choice-card>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Single-select "driver" cards, e.g. "how would you describe the
 * maintenance demands of your property?" with one option chosen from a
 * small set, each mapping to a value (a fee multiplier, a score weight,
 * etc). Implements the ARIA radiogroup pattern: arrow keys move and
 * select, Enter/Space selects, only one card is checked at a time.
 *
 * <bui-choice-group>:
 *   Attributes:
 *     name    form-field-style name, included in bui-change detail
 *     value   currently selected card's value (get/set)
 *   Events:
 *     bui-change — detail: { name, value } — fired whenever selection changes
 *
 * <bui-choice-card>:
 *   Attributes:
 *     value        the value this card represents (required)
 *     label        card title
 *     description  short supporting copy
 *     meta         trailing stat, e.g. "1.5x"
 *     meta-tone    "accent" | "slate" | "warning" | "danger" | "muted" (default)
 *                  — colors only the meta text, not the card's selection chrome
 *     disabled     boolean
 *   Slot:
 *     slot="icon"  optional icon/SVG shown above the label
 *
 * Usage:
 *   <bui-choice-group name="maintenance" value="active">
 *     <bui-choice-card value="streamlined" label="Streamlined"
 *       description="Minimal issues and low maintenance needs."
 *       meta="0.5x" meta-tone="slate"></bui-choice-card>
 *     <bui-choice-card value="standard" label="Standard"
 *       description="Typical maintenance for a property like yours."
 *       meta="1.0x" meta-tone="accent"></bui-choice-card>
 *     <bui-choice-card value="active" label="Active"
 *       description="Above-average maintenance activity and coordination."
 *       meta="1.5x" meta-tone="warning"></bui-choice-card>
 *     <bui-choice-card value="intensive" label="Intensive"
 *       description="High maintenance volume or complex requirements."
 *       meta="2.0x" meta-tone="danger"></bui-choice-card>
 *   </bui-choice-group>
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-choice-card] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-choice-card';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-choice-group { display: block; }',
    'bui-choice-group, bui-choice-group * { box-sizing: border-box; }',
    '.bui-choice-grid {',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));',
    '  gap: var(--bui-space-3);',
    '}',
    'bui-choice-card { display: block; }',
    'bui-choice-card, bui-choice-card * { box-sizing: border-box; }',
    '.bui-choice-card {',
    '  font-family: var(--bui-font-family);',
    '  position: relative;',
    '  cursor: pointer;',
    '  text-align: center;',
    '  border: 2px solid var(--bui-color-border);',
    '  background: var(--bui-color-surface);',
    '  border-radius: var(--bui-radius-md);',
    '  padding: var(--bui-space-5) var(--bui-space-3) var(--bui-space-4);',
    '  outline: none;',
    '}',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-choice-card { transition: border-color var(--bui-transition-base), background-color var(--bui-transition-base), box-shadow var(--bui-transition-base); }',
    '}',
    '.bui-choice-card[data-disabled="true"] { cursor: not-allowed; opacity: 0.5; }',
    '.bui-choice-card[aria-checked="true"] {',
    '  border-color: var(--bui-color-accent);',
    '  background: var(--bui-color-accent-bg);',
    '  box-shadow: 0 8px 22px rgba(192, 138, 46, 0.22);',
    '}',
    '.bui-choice-card:focus-visible { box-shadow: var(--bui-focus-ring); }',
    '.bui-choice-card__check {',
    '  position: absolute;',
    '  top: 10px;',
    '  right: 10px;',
    '  width: 20px;',
    '  height: 20px;',
    '  border-radius: 50%;',
    '  background: var(--bui-color-accent);',
    '  color: #FFFFFF;',
    '  display: none;',
    '  align-items: center;',
    '  justify-content: center;',
    '  font-size: 12px;',
    '  line-height: 1;',
    '}',
    '.bui-choice-card[aria-checked="true"] .bui-choice-card__check { display: flex; }',
    '.bui-choice-card__icon { color: var(--bui-color-slate); margin: 0 auto var(--bui-space-3); display: flex; justify-content: center; }',
    '.bui-choice-card__icon:empty { display: none; }',
    '.bui-choice-card__label { font-size: var(--bui-font-size-md); font-weight: 700; color: var(--bui-color-text); margin-bottom: var(--bui-space-1); }',
    '.bui-choice-card__description { font-size: var(--bui-font-size-sm); color: var(--bui-color-text-muted); line-height: 1.45; }',
    '.bui-choice-card__meta { font-size: 1.375rem; font-weight: 700; margin-top: var(--bui-space-2); color: var(--bui-color-text); }',
    '.bui-choice-card__meta[data-tone="accent"] { color: var(--bui-color-accent); }',
    '.bui-choice-card__meta[data-tone="slate"] { color: var(--bui-color-slate); }',
    '.bui-choice-card__meta[data-tone="warning"] { color: var(--bui-color-warning); }',
    '.bui-choice-card__meta[data-tone="danger"] { color: var(--bui-color-danger); }',
    '.bui-choice-card__meta:empty { display: none; }'
  ].join('\n'));

  /* ---------------------------------------------------------------------
   * <bui-choice-card>
   * ------------------------------------------------------------------- */
  class BuiChoiceCard extends HTMLElement {
    static get observedAttributes() {
      return ['label', 'description', 'meta', 'meta-tone', 'disabled'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var iconNode = this.querySelector('[slot="icon"]');
      this.innerHTML = '';

      var card = document.createElement('div');
      card.className = 'bui-choice-card';
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', 'false');
      card.tabIndex = -1;

      var check = document.createElement('span');
      check.className = 'bui-choice-card__check';
      check.innerHTML = '&#10003;';

      var icon = document.createElement('div');
      icon.className = 'bui-choice-card__icon';
      if (iconNode) icon.appendChild(iconNode);

      var label = document.createElement('div');
      label.className = 'bui-choice-card__label';

      var description = document.createElement('div');
      description.className = 'bui-choice-card__description';

      var meta = document.createElement('div');
      meta.className = 'bui-choice-card__meta';

      card.appendChild(check);
      card.appendChild(icon);
      card.appendChild(label);
      card.appendChild(description);
      card.appendChild(meta);
      this.appendChild(card);

      this._card = card;
      this._label = label;
      this._description = description;
      this._meta = meta;

      card.addEventListener('click', () => this._select());
      card.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault();
          this._select();
        }
      });

      this._syncAttrs();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._syncAttrs();
    }

    _syncAttrs() {
      this._label.textContent = this.getAttribute('label') || '';
      this._description.textContent = this.getAttribute('description') || '';
      this._meta.textContent = this.getAttribute('meta') || '';
      this._meta.dataset.tone = this.getAttribute('meta-tone') || 'default';
      this._card.dataset.disabled = this.hasAttribute('disabled') ? 'true' : 'false';
    }

    _select() {
      if (this.hasAttribute('disabled')) return;
      window.BUI.dispatch(this, 'bui-choice-select', { value: this.getAttribute('value') });
    }

    setChecked(checked) {
      this._card.setAttribute('aria-checked', checked ? 'true' : 'false');
      this._card.tabIndex = checked ? 0 : -1;
    }

    focusCard() {
      this._card.focus();
    }
  }

  window.BUI.registerComponent('bui-choice-card', BuiChoiceCard);

  /* ---------------------------------------------------------------------
   * <bui-choice-group>
   * ------------------------------------------------------------------- */
  class BuiChoiceGroup extends HTMLElement {
    static get observedAttributes() {
      return ['value', 'name'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var cards = Array.prototype.slice.call(this.children);
      var grid = document.createElement('div');
      grid.className = 'bui-choice-grid';
      grid.setAttribute('role', 'radiogroup');
      cards.forEach(function (c) { grid.appendChild(c); });
      this.appendChild(grid);
      this._grid = grid;

      this.addEventListener('bui-choice-select', (evt) => {
        evt.stopPropagation();
        this.value = evt.detail.value;
      });

      this.addEventListener('keydown', (evt) => {
        var keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
        if (keys.indexOf(evt.key) === -1) return;
        evt.preventDefault();

        var cards = this._cards();
        if (cards.length === 0) return;
        var currentIndex = cards.findIndex((c) => c.getAttribute('value') === this.value);
        if (currentIndex === -1) currentIndex = 0;

        var nextIndex = currentIndex;
        if (evt.key === 'ArrowRight' || evt.key === 'ArrowDown') nextIndex = (currentIndex + 1) % cards.length;
        else if (evt.key === 'ArrowLeft' || evt.key === 'ArrowUp') nextIndex = (currentIndex - 1 + cards.length) % cards.length;
        else if (evt.key === 'Home') nextIndex = 0;
        else if (evt.key === 'End') nextIndex = cards.length - 1;

        var nextCard = cards[nextIndex];
        this.value = nextCard.getAttribute('value');
        nextCard.focusCard();
      });

      this._syncSelection();
    }

    attributeChangedCallback(name) {
      if (!this._buiRendered) return;
      if (name === 'value') this._syncSelection();
    }

    _cards() {
      return Array.prototype.slice.call(this.querySelectorAll('bui-choice-card'));
    }

    _syncSelection() {
      var value = this.value;
      var cards = this._cards();
      cards.forEach((card) => {
        card.setChecked(card.getAttribute('value') === value);
      });
    }

    get value() {
      return this.getAttribute('value') || '';
    }

    set value(val) {
      var changed = this.getAttribute('value') !== val;
      this.setAttribute('value', val);
      if (changed) {
        window.BUI.dispatch(this, 'bui-change', { name: this.getAttribute('name') || '', value: val });
      }
    }
  }

  window.BUI.registerComponent('bui-choice-group', BuiChoiceGroup);
})();
