/*!
 * Brichaus UI Kit — <bui-alert> + BUI.toast()
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Inline usage (e.g. a form validation summary):
 *   <bui-alert variant="danger" dismissible>Please fix the errors below.</bui-alert>
 *
 * Attributes:
 *   variant       "info" (default) | "success" | "warning" | "danger"
 *   dismissible   boolean — shows a close button, emits bui-dismiss
 *   duration      ms — if set, auto-dismisses itself after this delay
 *
 * Toast usage (transient, stacked top-right, no markup needed):
 *   BUI.toast('Saved.', { variant: 'success' });
 *   BUI.toast('Something went wrong.', { variant: 'danger', duration: 6000 });
 *
 * Events:
 *   bui-dismiss — fires when the alert is closed (by user or timeout)
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-alert] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-alert';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-alert { display: block; }',
    'bui-alert, bui-alert * { box-sizing: border-box; }',
    '.bui-alert {',
    '  font-family: var(--bui-font-family);',
    '  font-size: var(--bui-font-size-md);',
    '  display: flex;',
    '  align-items: flex-start;',
    '  gap: var(--bui-space-3);',
    '  padding: var(--bui-space-3) var(--bui-space-4);',
    '  border-radius: var(--bui-radius-md);',
    '  border: 1px solid transparent;',
    '  line-height: 1.4;',
    '}',
    '.bui-alert[data-variant="info"] { background: var(--bui-color-info-bg); color: var(--bui-color-info); border-color: var(--bui-color-info); }',
    '.bui-alert[data-variant="success"] { background: var(--bui-color-success-bg); color: var(--bui-color-success); border-color: var(--bui-color-success); }',
    '.bui-alert[data-variant="warning"] { background: var(--bui-color-warning-bg); color: var(--bui-color-warning); border-color: var(--bui-color-warning); }',
    '.bui-alert[data-variant="danger"] { background: var(--bui-color-danger-bg); color: var(--bui-color-danger); border-color: var(--bui-color-danger); }',
    '.bui-alert__body { flex: 1 1 auto; }',
    '.bui-alert__close {',
    '  flex: 0 0 auto;',
    '  background: transparent;',
    '  border: none;',
    '  cursor: pointer;',
    '  font-size: 1.1em;',
    '  line-height: 1;',
    '  color: inherit;',
    '  opacity: 0.65;',
    '  padding: 0.1em 0.3em;',
    '  border-radius: var(--bui-radius-sm);',
    '}',
    '.bui-alert__close:hover { opacity: 1; }',
    '.bui-alert__close:focus-visible { outline: none; box-shadow: var(--bui-focus-ring); opacity: 1; }',
    '#bui-toast-region {',
    '  position: fixed;',
    '  top: var(--bui-space-4);',
    '  right: var(--bui-space-4);',
    '  z-index: 9999;',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: var(--bui-space-2);',
    '  max-width: min(360px, calc(100vw - 2 * var(--bui-space-4)));',
    '}',
    '#bui-toast-region bui-alert { box-shadow: var(--bui-shadow-lg); }',
    '#bui-toast-region .bui-alert {',
    '  transition: opacity var(--bui-transition-base), transform var(--bui-transition-base);',
    '}',
    '@media (prefers-reduced-motion: no-preference) {',
    '  #bui-toast-region .bui-alert[data-entering="true"] { opacity: 0; transform: translateY(-8px); }',
    '  #bui-toast-region .bui-alert[data-leaving="true"] { opacity: 0; transform: translateY(-8px); }',
    '}'
  ].join('\n'));

  class BuiAlert extends HTMLElement {
    static get observedAttributes() {
      return ['variant', 'dismissible', 'duration'];
    }

    connectedCallback() {
      if (this._buiRendered) {
        this._armTimer();
        return;
      }
      this._buiRendered = true;

      var content = Array.prototype.slice.call(this.childNodes);
      this.innerHTML = '';

      var alert = document.createElement('div');
      alert.className = 'bui-alert';

      var body = document.createElement('div');
      body.className = 'bui-alert__body';
      content.forEach(function (n) { body.appendChild(n); });

      alert.appendChild(body);
      this.appendChild(alert);
      this._alert = alert;

      this._syncAttrs();
      this._armTimer();
    }

    disconnectedCallback() {
      if (this._timer) clearTimeout(this._timer);
    }

    attributeChangedCallback() {
      if (this._buiRendered) {
        this._syncAttrs();
        this._armTimer();
      }
    }

    _syncAttrs() {
      var variant = this.getAttribute('variant') || 'info';
      this._alert.dataset.variant = variant;
      this._alert.setAttribute('role', variant === 'danger' ? 'alert' : 'status');
      this._alert.setAttribute('aria-live', variant === 'danger' ? 'assertive' : 'polite');

      var existingClose = this._alert.querySelector('.bui-alert__close');
      if (this.hasAttribute('dismissible') && !existingClose) {
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'bui-alert__close';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.dismiss());
        this._alert.appendChild(closeBtn);
      } else if (!this.hasAttribute('dismissible') && existingClose) {
        existingClose.remove();
      }
    }

    _armTimer() {
      if (this._timer) clearTimeout(this._timer);
      var duration = parseInt(this.getAttribute('duration'), 10);
      if (duration > 0) {
        this._timer = setTimeout(() => this.dismiss(), duration);
      }
    }

    dismiss() {
      window.BUI.dispatch(this, 'bui-dismiss', null);
      if (this.parentNode) this.parentNode.removeChild(this);
    }
  }

  window.BUI.registerComponent('bui-alert', BuiAlert);

  /* ---------------------------------------------------------------------
   * BUI.toast(message, options) — convenience API for transient toasts.
   * Reuses <bui-alert>; lazily creates a single fixed-position stacking
   * region the first time it's called.
   * ------------------------------------------------------------------- */
  function getToastRegion() {
    var region = document.getElementById('bui-toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'bui-toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    return region;
  }

  window.BUI.toast = function (message, options) {
    options = options || {};
    var region = getToastRegion();

    var el = document.createElement('bui-alert');
    el.setAttribute('variant', options.variant || 'info');
    if (options.dismissible !== false) el.setAttribute('dismissible', '');
    el.setAttribute('duration', String(options.duration || 4000));
    el.textContent = message;

    region.appendChild(el);

    if (!window.BUI.prefersReducedMotion()) {
      requestAnimationFrame(function () {
        var inner = el.querySelector('.bui-alert');
        if (inner) {
          inner.dataset.entering = 'true';
          requestAnimationFrame(function () { inner.dataset.entering = 'false'; });
        }
      });
    }

    return el;
  };
})();
