/*!
 * Brichaus UI Kit — core.js
 * Single source of truth: design tokens, component registration guard,
 * DOM helpers, event bus, tiny state store.
 * Load this in full on every page. Components in /components depend on it
 * and only it — nothing else in this file should ever be split out.
 */
(function (window, document) {
  'use strict';

  if (window.BUI && window.BUI.__CORE_LOADED__) {
    return; // core.js included twice on the same page — no-op, safe.
  }

  /* ---------------------------------------------------------------------
   * Design tokens
   * Exposed as CSS custom properties on :root so both the kit's own
   * component stylesheets and the host page's CSS can read/override them.
   * To override per project, add a <style> block AFTER core.js's <script>
   * tag that redeclares the same --bui-* variables on :root (see README).
   * ------------------------------------------------------------------- */
  var DEFAULT_TOKENS = {
    '--bui-font-family': "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",

    /* Gold — conversion-moment CTAs ("Generate My Report", "Schedule Consultation"). */
    '--bui-color-accent': '#C08A2E',
    '--bui-color-accent-hover': '#A6752A',
    '--bui-color-accent-contrast': '#FFFFFF',
    '--bui-color-accent-bg': '#F4EAE6',
    '--bui-color-accent-bg-border': '#E4D3CB',
    '--bui-color-accent-light': '#E0A94A',

    /* Slate — forward-navigation default (step headers, "Continue" buttons),
     * distinct from the Gold conversion accent above. */
    '--bui-color-slate': '#4A5A72',
    '--bui-color-slate-hover': '#3E4C61',
    '--bui-color-slate-light': '#6E8299',
    '--bui-color-slate-contrast': '#FFFFFF',

    /* Charcoal — kept from the original brand pass; still the text/dark-surface color. */
    '--bui-color-surface-dark': '#211E1C',
    '--bui-color-surface-dark-hover': '#332E2B',

    '--bui-color-bg': '#F4F5F7',
    '--bui-color-surface': '#FFFFFF',
    '--bui-color-border': '#E3E6EB',
    '--bui-color-border-strong': '#D7DCE3',

    '--bui-color-text': '#211E1C',
    '--bui-color-text-muted': '#6B7480',
    '--bui-color-text-faint': '#9AA2AD',
    '--bui-color-text-on-dark': '#F7F6F4',

    /* Brick — was the original accent; now the error/high-intensity semantic color. */
    '--bui-color-danger': '#9C3F2C',
    '--bui-color-danger-bg': '#F4EAE6',
    /* Amber — mid-tier warning / moderate-intensity states. */
    '--bui-color-warning': '#B5631E',
    '--bui-color-warning-bg': '#FBEEE1',
    '--bui-color-success': '#33623A',
    '--bui-color-success-bg': '#E9F1EA',
    '--bui-color-info': '#4A5A72',
    '--bui-color-info-bg': '#EDF1F6',

    '--bui-radius-sm': '6px',
    '--bui-radius-md': '8px',
    '--bui-radius-lg': '14px',
    '--bui-radius-pill': '999px',

    '--bui-space-1': '4px',
    '--bui-space-2': '8px',
    '--bui-space-3': '12px',
    '--bui-space-4': '16px',
    '--bui-space-5': '24px',
    '--bui-space-6': '32px',

    '--bui-font-size-sm': '0.8125rem',
    '--bui-font-size-md': '0.9375rem',
    '--bui-font-size-lg': '1.125rem',

    '--bui-shadow-sm': '0 1px 2px rgba(16, 42, 76, 0.05)',
    '--bui-shadow-md': '0 6px 22px rgba(16, 42, 76, 0.08)',
    '--bui-shadow-lg': '0 12px 30px rgba(16, 42, 76, 0.12)',

    '--bui-transition-fast': '120ms ease',
    '--bui-transition-base': '200ms ease',

    '--bui-focus-ring': '0 0 0 3px rgba(192, 138, 46, 0.35)',
    '--bui-focus-ring-danger': '0 0 0 3px rgba(156, 63, 44, 0.35)'
  };

  function injectTokens() {
    if (document.getElementById('bui-tokens')) return;

    // Allow a page to set window.BUI_TOKENS = { '--bui-color-accent': '#000' }
    // BEFORE core.js loads, for JS-driven per-project overrides.
    var overrides = window.BUI_TOKENS || {};
    var tokens = {};
    var key;
    for (key in DEFAULT_TOKENS) tokens[key] = DEFAULT_TOKENS[key];
    for (key in overrides) tokens[key] = overrides[key];

    var lines = [];
    for (key in tokens) lines.push('  ' + key + ': ' + tokens[key] + ';');

    var style = document.createElement('style');
    style.id = 'bui-tokens';
    style.textContent = ':root {\n' + lines.join('\n') + '\n}';
    document.head.appendChild(style);

    window.BUI.tokens = tokens;
  }

  function ensureFont() {
    if (document.querySelector('link[data-bui-font]')) return;

    var preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    preconnect1.setAttribute('data-bui-font', '');

    var preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    preconnect2.setAttribute('data-bui-font', '');

    var stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap';
    stylesheet.setAttribute('data-bui-font', '');

    document.head.appendChild(preconnect1);
    document.head.appendChild(preconnect2);
    document.head.appendChild(stylesheet);
  }

  /* ---------------------------------------------------------------------
   * Component registration
   * Every component file calls BUI.registerComponent(tag, class) instead
   * of customElements.define directly, so a script accidentally included
   * twice on one page (GHL duplicates embeds across sections sometimes)
   * never throws.
   * ------------------------------------------------------------------- */
  function registerComponent(tagName, ctor) {
    if (!window.customElements.get(tagName)) {
      window.customElements.define(tagName, ctor);
    }
  }

  /* Guarded per-component stylesheet injection. Each component calls this
   * once at module scope with a unique id — safe against double-loading. */
  function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    var style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ---------------------------------------------------------------------
   * DOM helpers
   * ------------------------------------------------------------------- */
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function uid(prefix) {
    return (prefix || 'bui') + '-' + Math.random().toString(36).slice(2, 9);
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function dispatch(el, name, detail) {
    el.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true, composed: true }));
  }

  /* Tiny element builder: h('button', {class: 'x', type: 'button'}, ['Go'])
   * children may be strings or Nodes. Kept minimal on purpose — this is not
   * a virtual DOM, just a readability helper for component render methods. */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    for (var key in attrs) {
      if (attrs[key] === null || attrs[key] === undefined || attrs[key] === false) continue;
      if (key === 'class') el.className = attrs[key];
      else if (key.indexOf('on') === 0 && typeof attrs[key] === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
      } else {
        el.setAttribute(key, attrs[key] === true ? '' : attrs[key]);
      }
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return el;
  }

  /* ---------------------------------------------------------------------
   * Event bus — cross-component / cross-section pub-sub.
   * Useful when a stepper in one embed needs to talk to a score-gauge in
   * another section without either knowing about the other's markup.
   * ------------------------------------------------------------------- */
  var busTarget = new EventTarget();
  var bus = {
    on: function (evt, fn) {
      busTarget.addEventListener(evt, fn);
      return function () { busTarget.removeEventListener(evt, fn); };
    },
    off: function (evt, fn) {
      busTarget.removeEventListener(evt, fn);
    },
    emit: function (evt, detail) {
      busTarget.dispatchEvent(new CustomEvent(evt, { detail: detail }));
    }
  };

  /* ---------------------------------------------------------------------
   * Minimal state store — for wizard/quiz flows that need to share state
   * (current answers, running score) across independently-loaded
   * components without a framework.
   * ------------------------------------------------------------------- */
  function createStore(initialState) {
    var state = Object.assign({}, initialState);
    var listeners = new Set();
    return {
      getState: function () { return state; },
      setState: function (patch) {
        state = Object.assign({}, state, typeof patch === 'function' ? patch(state) : patch);
        listeners.forEach(function (fn) { fn(state); });
      },
      subscribe: function (fn) {
        listeners.add(fn);
        return function () { listeners.delete(fn); };
      }
    };
  }

  window.BUI = {
    __CORE_LOADED__: true,
    version: '1.0.0',
    tokens: {},
    registerComponent: registerComponent,
    injectStyle: injectStyle,
    dom: { qs: qs, qsa: qsa, h: h },
    uid: uid,
    prefersReducedMotion: prefersReducedMotion,
    dispatch: dispatch,
    bus: bus,
    createStore: createStore
  };

  injectTokens();
  ensureFont();
})(window, document);
