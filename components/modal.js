/*!
 * Brichaus UI Kit — <bui-modal>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Attributes:
 *   open               boolean, reflected — toggling it (or calling
 *                       .show()/.hide()) opens/closes the modal.
 *   label              accessible name (aria-label) if no slot="title" is used
 *   no-backdrop-close   boolean — disable click-outside-to-close
 *
 * Slots (by attribute):
 *   slot="title"   header content (otherwise aria-label is used)
 *   slot="footer"  footer content, typically action buttons
 *   (unslotted children become the body)
 *
 * Usage:
 *   <bui-modal id="confirm" label="Confirm submission">
 *     <div slot="title">Submit assessment?</div>
 *     <p>You can't edit answers after this.</p>
 *     <div slot="footer">
 *       <bui-button variant="secondary" onclick="confirm.hide()">Cancel</bui-button>
 *       <bui-button onclick="confirm.hide()">Submit</bui-button>
 *     </div>
 *   </bui-modal>
 *   <script>document.getElementById('confirm').show();</script>
 *
 * Behavior:
 *   - Traps Tab/Shift+Tab focus within the modal while open.
 *   - Escape closes it (unless no-backdrop-close disables all dismiss-by-click,
 *     which does NOT affect Escape — Escape always works for keyboard users).
 *   - Restores focus to the previously focused element on close.
 *   - Locks page scroll while open.
 *   - Fade/scale transition respects prefers-reduced-motion.
 *
 * Events:
 *   bui-open, bui-close
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-modal] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-modal';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-modal { display: contents; }',
    'bui-modal, bui-modal * { box-sizing: border-box; }',
    '.bui-modal__backdrop {',
    '  position: fixed;',
    '  inset: 0;',
    '  background: rgba(33, 30, 28, 0.55);',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: var(--bui-space-4);',
    '  z-index: 1000;',
    '}',
    '.bui-modal__dialog {',
    '  font-family: var(--bui-font-family);',
    '  background: var(--bui-color-surface);',
    '  color: var(--bui-color-text);',
    '  border-radius: var(--bui-radius-lg);',
    '  box-shadow: var(--bui-shadow-lg);',
    '  max-width: 480px;',
    '  width: 100%;',
    '  max-height: calc(100vh - 2 * var(--bui-space-4));',
    '  overflow-y: auto;',
    '  display: flex;',
    '  flex-direction: column;',
    '}',
    '.bui-modal__header {',
    '  display: flex;',
    '  align-items: flex-start;',
    '  justify-content: space-between;',
    '  gap: var(--bui-space-3);',
    '  padding: var(--bui-space-5) var(--bui-space-5) 0;',
    '  font-weight: 600;',
    '  font-size: var(--bui-font-size-lg);',
    '}',
    '.bui-modal__close {',
    '  flex: 0 0 auto;',
    '  background: transparent;',
    '  border: none;',
    '  cursor: pointer;',
    '  font-size: 1.3em;',
    '  line-height: 1;',
    '  color: var(--bui-color-text-muted);',
    '  padding: 0.1em 0.3em;',
    '  border-radius: var(--bui-radius-sm);',
    '}',
    '.bui-modal__close:hover { color: var(--bui-color-text); }',
    '.bui-modal__close:focus-visible { outline: none; box-shadow: var(--bui-focus-ring); }',
    '.bui-modal__body { padding: var(--bui-space-5); flex: 1 1 auto; }',
    '.bui-modal__footer {',
    '  display: flex;',
    '  justify-content: flex-end;',
    '  gap: var(--bui-space-2);',
    '  padding: 0 var(--bui-space-5) var(--bui-space-5);',
    '}',
    '.bui-modal__header:empty, .bui-modal__footer:empty { display: none; }',
    '@media (prefers-reduced-motion: no-preference) {',
    '  .bui-modal__backdrop { animation: bui-modal-fade-in var(--bui-transition-base); }',
    '  .bui-modal__dialog { animation: bui-modal-scale-in var(--bui-transition-base); }',
    '}',
    '@keyframes bui-modal-fade-in { from { opacity: 0; } to { opacity: 1; } }',
    '@keyframes bui-modal-scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }'
  ].join('\n'));

  var FOCUSABLE_SELECTOR = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  var openModalCount = 0;

  class BuiModal extends HTMLElement {
    static get observedAttributes() {
      return ['open', 'label'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var children = Array.prototype.slice.call(this.children);
      var titleNodes = children.filter(function (n) { return n.getAttribute('slot') === 'title'; });
      var footerNodes = children.filter(function (n) { return n.getAttribute('slot') === 'footer'; });
      var bodyNodes = children.filter(function (n) {
        var slot = n.getAttribute('slot');
        return slot !== 'title' && slot !== 'footer';
      });

      this.innerHTML = '';

      var backdrop = document.createElement('div');
      backdrop.className = 'bui-modal__backdrop';
      backdrop.style.display = 'none';

      var dialog = document.createElement('div');
      dialog.className = 'bui-modal__dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.tabIndex = -1;

      var header = document.createElement('div');
      header.className = 'bui-modal__header';
      var titleWrap = document.createElement('div');
      titleNodes.forEach(function (n) { titleWrap.appendChild(n); });
      header.appendChild(titleWrap);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'bui-modal__close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => this.hide());
      header.appendChild(closeBtn);

      var body = document.createElement('div');
      body.className = 'bui-modal__body';
      bodyNodes.forEach(function (n) { body.appendChild(n); });

      var footer = document.createElement('div');
      footer.className = 'bui-modal__footer';
      footerNodes.forEach(function (n) { footer.appendChild(n); });

      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(footer);
      backdrop.appendChild(dialog);
      this.appendChild(backdrop);

      this._backdrop = backdrop;
      this._dialog = dialog;
      this._titleWrap = titleWrap;
      this._lastFocused = null;

      backdrop.addEventListener('mousedown', (evt) => {
        if (evt.target === backdrop && !this.hasAttribute('no-backdrop-close')) {
          this.hide();
        }
      });

      this._onKeydown = this._onKeydown.bind(this);

      this._syncAttrs();
      if (this.hasAttribute('open')) this._open();
    }

    disconnectedCallback() {
      if (this.hasAttribute('open')) this._teardownOpenState();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._buiRendered) return;
      if (name === 'open') {
        if (newVal !== null) this._open(); else this._close();
      } else {
        this._syncAttrs();
      }
    }

    _syncAttrs() {
      if (this._titleWrap.childNodes.length === 0) {
        var label = this.getAttribute('label');
        if (label) this._dialog.setAttribute('aria-label', label);
      } else {
        this._dialog.removeAttribute('aria-label');
        this._dialog.setAttribute('aria-labelledby', '');
      }
    }

    show() { this.setAttribute('open', ''); }
    hide() { this.removeAttribute('open'); }
    toggle() {
      if (this.hasAttribute('open')) this.hide(); else this.show();
    }

    _open() {
      this._lastFocused = document.activeElement;
      this._backdrop.style.display = '';

      openModalCount++;
      document.body.style.overflow = 'hidden';

      document.addEventListener('keydown', this._onKeydown, true);

      var focusTarget = this._dialog.querySelector(FOCUSABLE_SELECTOR) || this._dialog;
      // Defer so display:none -> visible paint completes before focusing.
      requestAnimationFrame(function () { focusTarget.focus(); });

      window.BUI.dispatch(this, 'bui-open', null);
    }

    _close() {
      if (this._backdrop.style.display === 'none') return;
      this._teardownOpenState();
      window.BUI.dispatch(this, 'bui-close', null);
    }

    _teardownOpenState() {
      this._backdrop.style.display = 'none';
      document.removeEventListener('keydown', this._onKeydown, true);

      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) document.body.style.overflow = '';

      if (this._lastFocused && typeof this._lastFocused.focus === 'function') {
        this._lastFocused.focus();
      }
    }

    _onKeydown(evt) {
      if (evt.key === 'Escape') {
        evt.stopPropagation();
        this.hide();
        return;
      }
      if (evt.key !== 'Tab') return;

      var focusable = window.BUI.dom.qsa(FOCUSABLE_SELECTOR, this._dialog);
      if (focusable.length === 0) {
        evt.preventDefault();
        return;
      }

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (evt.shiftKey && document.activeElement === first) {
        evt.preventDefault();
        last.focus();
      } else if (!evt.shiftKey && document.activeElement === last) {
        evt.preventDefault();
        first.focus();
      } else if (!this._dialog.contains(document.activeElement)) {
        evt.preventDefault();
        first.focus();
      }
    }
  }

  window.BUI.registerComponent('bui-modal', BuiModal);
})();
