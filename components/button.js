/*!
 * Brichaus UI Kit — <bui-button>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Attributes:
 *   variant     "primary" (default) | "slate" | "secondary" | "ghost" | "danger"
 *   size        "sm" | "md" (default) | "lg"
 *   type        "button" (default) | "submit" | "reset"
 *   disabled    boolean
 *   full-width  boolean
 *
 * variant guide: "primary" (gold) is for conversion moments only —
 * "Generate My Report," "Schedule Consultation." "slate" is the default
 * forward-navigation action ("Continue") between steps that aren't the
 * conversion moment itself.
 *
 * Usage:
 *   <bui-button variant="slate">Continue</bui-button>
 *   <bui-button variant="primary">Generate My Report</bui-button>
 *   <bui-button variant="secondary" size="sm" disabled>Locked</bui-button>
 *
 * Events:
 *   bui-click  — fired on activation (click or Enter/Space), not fired if disabled.
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-button] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-button';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-button { display: inline-block; }',
    'bui-button, bui-button * { box-sizing: border-box; }',
    '.bui-btn {',
    '  font-family: var(--bui-font-family);',
    '  font-size: var(--bui-font-size-md);',
    '  font-weight: 600;',
    '  line-height: 1.2;',
    '  letter-spacing: 0.01em;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: var(--bui-space-2);',
    '  padding: 0.65em 1.25em;',
    '  border-radius: var(--bui-radius-sm);',
    '  border: 1px solid transparent;',
    '  cursor: pointer;',
    '  transition: background-color var(--bui-transition-fast), border-color var(--bui-transition-fast), color var(--bui-transition-fast), box-shadow var(--bui-transition-fast);',
    '  text-decoration: none;',
    '  white-space: nowrap;',
    '}',
    '.bui-btn:focus-visible { outline: none; box-shadow: var(--bui-focus-ring); }',
    '.bui-btn[data-size="sm"] { font-size: var(--bui-font-size-sm); padding: 0.45em 0.9em; }',
    '.bui-btn[data-size="lg"] { font-size: var(--bui-font-size-lg); padding: 0.8em 1.6em; }',
    '.bui-btn[data-full-width="true"] { display: flex; width: 100%; }',
    '.bui-btn[data-variant="primary"] { background: var(--bui-color-accent); color: var(--bui-color-accent-contrast); border-color: var(--bui-color-accent); box-shadow: 0 3px 10px rgba(192, 138, 46, 0.35); }',
    '.bui-btn[data-variant="primary"]:hover:not(:disabled) { background: var(--bui-color-accent-hover); border-color: var(--bui-color-accent-hover); }',
    '.bui-btn[data-variant="slate"] { background: var(--bui-color-slate); color: var(--bui-color-slate-contrast); border-color: var(--bui-color-slate); box-shadow: 0 2px 6px rgba(18, 51, 90, 0.25); }',
    '.bui-btn[data-variant="slate"]:hover:not(:disabled) { background: var(--bui-color-slate-hover); border-color: var(--bui-color-slate-hover); }',
    '.bui-btn[data-variant="secondary"] { background: transparent; color: var(--bui-color-surface-dark); border-color: var(--bui-color-border-strong); }',
    '.bui-btn[data-variant="secondary"]:hover:not(:disabled) { background: var(--bui-color-bg); border-color: var(--bui-color-surface-dark); }',
    '.bui-btn[data-variant="ghost"] { background: transparent; color: var(--bui-color-surface-dark); border-color: transparent; }',
    '.bui-btn[data-variant="ghost"]:hover:not(:disabled) { background: var(--bui-color-bg); }',
    '.bui-btn[data-variant="danger"] { background: var(--bui-color-danger); color: #FFFFFF; border-color: var(--bui-color-danger); }',
    '.bui-btn[data-variant="danger"]:hover:not(:disabled) { filter: brightness(0.92); }',
    '.bui-btn:disabled { cursor: not-allowed; opacity: 0.5; }'
  ].join('\n'));

  class BuiButton extends HTMLElement {
    static get observedAttributes() {
      return ['variant', 'size', 'disabled', 'full-width', 'type'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var label = this.textContent.trim();
      this.textContent = '';

      var btn = document.createElement('button');
      btn.className = 'bui-btn';
      btn.textContent = label;
      this.appendChild(btn);
      this._btn = btn;

      btn.addEventListener('click', (evt) => {
        if (this.hasAttribute('disabled')) {
          evt.stopImmediatePropagation();
          evt.preventDefault();
          return;
        }
        window.BUI.dispatch(this, 'bui-click', { originalEvent: evt });
      });

      this._syncAttrs();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._syncAttrs();
    }

    _syncAttrs() {
      var btn = this._btn;
      btn.type = this.getAttribute('type') || 'button';
      btn.dataset.variant = this.getAttribute('variant') || 'primary';
      btn.dataset.size = this.getAttribute('size') || 'md';
      btn.dataset.fullWidth = this.hasAttribute('full-width') ? 'true' : 'false';
      btn.disabled = this.hasAttribute('disabled');
    }
  }

  window.BUI.registerComponent('bui-button', BuiButton);
})();
