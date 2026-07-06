/*!
 * Brichaus UI Kit — <bui-card>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * Attributes:
 *   variant  "elevated" (default) | "outlined" | "flat" | "tinted" | "info"
 *   padding  "sm" | "md" (default) | "lg"
 *
 * variant guide: "tinted" is the gold/blush callout for highlighted
 * insights ("Primary Drivers," "Key Insights"). "info" is the neutral
 * muted-surface card for secondary factual context.
 *
 * Slots (by attribute, not <slot> — this is light DOM):
 *   slot="header"  optional header region
 *   slot="footer"  optional footer region
 *   (unslotted children become the body)
 *
 * Usage:
 *   <bui-card variant="outlined">
 *     <div slot="header">Plan summary</div>
 *     <p>Your assessment is ready.</p>
 *     <div slot="footer"><bui-button>Continue</bui-button></div>
 *   </bui-card>
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-card] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-card';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-card { display: block; }',
    'bui-card, bui-card * { box-sizing: border-box; }',
    '.bui-card {',
    '  font-family: var(--bui-font-family);',
    '  background: var(--bui-color-surface);',
    '  border-radius: var(--bui-radius-lg);',
    '  color: var(--bui-color-text);',
    '}',
    '.bui-card[data-variant="elevated"] { box-shadow: var(--bui-shadow-md); border: 1px solid transparent; }',
    '.bui-card[data-variant="outlined"] { border: 1px solid var(--bui-color-border); }',
    '.bui-card[data-variant="flat"] { border: 1px solid transparent; background: var(--bui-color-bg); }',
    '.bui-card[data-variant="tinted"] { background: var(--bui-color-accent-bg); border: 1px solid var(--bui-color-accent-bg-border); }',
    '.bui-card[data-variant="info"] { background: var(--bui-color-bg); border: 1px solid var(--bui-color-border); }',
    '.bui-card__header { padding: var(--bui-space-4) var(--bui-space-5) 0; font-weight: 600; }',
    '.bui-card__body { padding: var(--bui-space-5); }',
    '.bui-card__footer { padding: 0 var(--bui-space-5) var(--bui-space-4); }',
    '.bui-card[data-padding="sm"] .bui-card__header { padding: var(--bui-space-3) var(--bui-space-3) 0; }',
    '.bui-card[data-padding="sm"] .bui-card__body { padding: var(--bui-space-3); }',
    '.bui-card[data-padding="sm"] .bui-card__footer { padding: 0 var(--bui-space-3) var(--bui-space-3); }',
    '.bui-card[data-padding="lg"] .bui-card__header { padding: var(--bui-space-6) var(--bui-space-6) 0; }',
    '.bui-card[data-padding="lg"] .bui-card__body { padding: var(--bui-space-6); }',
    '.bui-card[data-padding="lg"] .bui-card__footer { padding: 0 var(--bui-space-6) var(--bui-space-6); }',
    '.bui-card__header:empty, .bui-card__footer:empty { display: none; }'
  ].join('\n'));

  class BuiCard extends HTMLElement {
    static get observedAttributes() {
      return ['variant', 'padding'];
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var children = Array.prototype.slice.call(this.children);
      var headerNodes = children.filter(function (n) { return n.getAttribute('slot') === 'header'; });
      var footerNodes = children.filter(function (n) { return n.getAttribute('slot') === 'footer'; });
      var bodyNodes = children.filter(function (n) {
        var slot = n.getAttribute('slot');
        return slot !== 'header' && slot !== 'footer';
      });

      this.innerHTML = '';

      var card = document.createElement('div');
      card.className = 'bui-card';

      var header = document.createElement('div');
      header.className = 'bui-card__header';
      headerNodes.forEach(function (n) { header.appendChild(n); });

      var body = document.createElement('div');
      body.className = 'bui-card__body';
      bodyNodes.forEach(function (n) { body.appendChild(n); });

      var footer = document.createElement('div');
      footer.className = 'bui-card__footer';
      footerNodes.forEach(function (n) { footer.appendChild(n); });

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(footer);
      this.appendChild(card);

      this._card = card;
      this._syncAttrs();
    }

    attributeChangedCallback() {
      if (this._buiRendered) this._syncAttrs();
    }

    _syncAttrs() {
      this._card.dataset.variant = this.getAttribute('variant') || 'elevated';
      this._card.dataset.padding = this.getAttribute('padding') || 'md';
    }
  }

  window.BUI.registerComponent('bui-card', BuiCard);
})();
