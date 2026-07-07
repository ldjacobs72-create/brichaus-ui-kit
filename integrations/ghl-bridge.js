/*!
 * Brichaus UI Kit — GHL Bridge (ghl-bridge.js)
 * Depends on core.js. GHL-SPECIFIC — this file does NOT pass the kit's
 * own portability test ("copy this file plus core.js into any other
 * project's /ui-kit folder and it works immediately"). It talks directly
 * to GoHighLevel's own native fields by `name`, so it belongs in its own
 * /integrations folder, loaded only on pages that actually need it — not
 * in /components alongside the portable, GHL-agnostic files.
 *
 * PROBLEM THIS SOLVES
 * A bui-* component's value never reaches a GHL submission on its own —
 * GHL only submits its own tracked native fields, and blocks arbitrary
 * non-field data from a submission by default. The fix is always the
 * same shape, whether the field is an address, a select, or a computed
 * value with no native counterpart: find the real native field by its
 * `name`, write .value, and dispatch the events GHL's own hydration is
 * listening for — twice, because a single write can lose a race with
 * GHL's own re-render.
 *
 * Two different situations use this differently:
 *   - REPLACING a native field that already has a name (address, select,
 *     etc.): hide the native control off-screen — never display:none,
 *     which GHL's own visibility/conditional-logic handling appears to
 *     exclude from a submission — and mirror your bui-* component's
 *     value into it as the user interacts with it.
 *   - SUPPLEMENTING with a value that has no native field of its own (a
 *     computed choice-card value, a dial-gauge result, etc.): create a
 *     real custom field to hold it first (for Surveys, hide that one
 *     with CSS rather than a builder toggle), then treat it the same way
 *     as a replacement target.
 *
 * API
 *   BUI.ghl.hideNative(el)
 *     Visually hides a native field but keeps it in the DOM/layout in
 *     the way that (per observed behavior) survives GHL's own submission
 *     and conditional-logic handling. Use on the ORIGINAL field you're
 *     replacing, not on the bui-* component shown in its place.
 *
 *   BUI.ghl.writeField(name, value, options)
 *     Finds the native field by `name` and writes `value` into it twice
 *     — immediately, then again after a short delay — dispatching
 *     input/change (optionally blur) each time. Returns true if the
 *     field was found, false otherwise.
 *     options: { retryDelay (default 50), events (default ['input','change']) }
 *
 *   BUI.ghl.whenFieldReady(name, callback, options)
 *     GHL's hydration timing is unpredictable — a native field may not
 *     exist in the DOM yet when your script runs. Polls for it, and also
 *     listens for `hydrationDone` and DOMContentLoaded as earlier
 *     signals to check sooner. Calls callback(fieldEl) once found, then
 *     stops.
 *     options: { interval (default 300), maxAttempts (default 50) }
 *
 *   BUI.ghl.bindField(sourceEl, eventName, fieldName, options)
 *     Listens for `eventName` on `sourceEl` (any bui-* component or
 *     plain element) and calls writeField(fieldName, value) every time
 *     it fires. `value` defaults to event.detail.value; override with
 *     options.getValue(event) for a different event shape (e.g.
 *     bui-address-select's { description, placeId, place }).
 *     options.write is passed through to writeField as its `options`.
 *
 *   BUI.ghl.submitNative(selector)
 *     Finds GHL's own native submit control by `selector` and clicks it.
 *     GHL's Survey/Form submit button is not a real <button type="submit">
 *     in a <form> — it's a JS-bound element (observed as a
 *     role="button" div with its own click handler), so a real form
 *     submit event never fires and .requestSubmit() has nothing to call.
 *     .click() is the only reliable way to invoke GHL's own submission
 *     logic from outside code. Returns true if an element matched,
 *     false otherwise (nothing was clicked).
 *     Note: this only fires GHL's submission — it does not confirm the
 *     record has been created/persisted server-side by the time it
 *     returns. Anything that depends on the record existing (e.g. an
 *     n8n search-by-unique-field immediately afterward) needs its own
 *     buffer delay after calling this.
 *
 * USAGE — replacing a native select with <bui-select>:
 *   BUI.ghl.whenFieldReady('Rcyi4EKdLtvUZWmEsKM4', function (native) {
 *     BUI.ghl.hideNative(native);
 *     BUI.ghl.bindField(
 *       document.querySelector('bui-select[name="driverType"]'),
 *       'bui-change', 'Rcyi4EKdLtvUZWmEsKM4'
 *     );
 *   });
 *
 * USAGE — supplementing with a value that has no native field:
 *   BUI.ghl.whenFieldReady('xxDriverScoreHolder', function () {
 *     BUI.ghl.bindField(
 *       document.querySelector('bui-choice-group[name="maintenance"]'),
 *       'bui-change', 'xxDriverScoreHolder'
 *     );
 *   });
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-ghl-bridge] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-ghl-bridge';
  window.BUI.injectStyle(STYLE_ID, [
    // position: fixed at the viewport's own corner (0,0), not position:
    // absolute pushed to a huge document-relative offset — the latter
    // leaves the element at its natural (possibly far-down) vertical
    // position, still document-scrollable-to; if anything ever calls
    // .focus()/.scrollIntoView() on a hidden native field (a framework's
    // own validation/focus handling, for instance), the browser would
    // jump the whole page there. A fixed element pinned inside the
    // viewport bounds is already "in view" by definition, so nothing can
    // ever need to scroll to reach it.
    '.bui-ghl-hidden-native {',
    '  position: fixed !important;',
    '  top: 0 !important;',
    '  left: 0 !important;',
    '  width: 1px !important;',
    '  height: 1px !important;',
    '  opacity: 0 !important;',
    '  pointer-events: none !important;',
    '}'
  ].join('\n'));

  function findField(name) {
    return window.BUI.dom.qs('[name="' + name + '"]');
  }

  function hideNative(el) {
    if (!el) return;
    el.classList.add('bui-ghl-hidden-native');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('tabindex', '-1');
  }

  function dispatchNativeEvents(el, events) {
    events.forEach(function (name) {
      el.dispatchEvent(new Event(name, { bubbles: true }));
    });
  }

  function writeField(name, value, options) {
    options = options || {};
    var retryDelay = options.retryDelay === undefined ? 50 : options.retryDelay;
    var events = options.events || ['input', 'change'];

    var el = findField(name);
    if (!el) return false;

    var str = value === null || value === undefined ? '' : String(value);

    el.value = str;
    dispatchNativeEvents(el, events);

    // GHL can occasionally miss or overwrite the first write during its own
    // hydration/re-render — observed fix, not a guess: without this second
    // pass a value that looks right on screen can still submit empty.
    if (retryDelay > 0) {
      setTimeout(function () {
        var elAgain = findField(name); // re-query in case GHL replaced the node
        if (!elAgain) return;
        elAgain.value = str;
        dispatchNativeEvents(elAgain, events);
      }, retryDelay);
    }

    return true;
  }

  function whenFieldReady(name, callback, options) {
    options = options || {};
    var interval = options.interval || 300;
    var maxAttempts = options.maxAttempts || 50;
    var attempts = 0;
    var done = false;

    function tryNow() {
      if (done) return true;
      var el = findField(name);
      if (el) {
        done = true;
        callback(el);
        return true;
      }
      return false;
    }

    if (tryNow()) return;

    document.addEventListener('DOMContentLoaded', tryNow);
    document.addEventListener('hydrationDone', tryNow);

    var timer = setInterval(function () {
      attempts++;
      if (tryNow() || attempts >= maxAttempts) clearInterval(timer);
    }, interval);
  }

  function bindField(sourceEl, eventName, fieldName, options) {
    options = options || {};
    var getValue = options.getValue || function (evt) {
      return evt && evt.detail ? evt.detail.value : undefined;
    };

    if (!sourceEl) {
      console.error('[bui-ghl-bridge] bindField: sourceEl not found for "' + fieldName + '".');
      return;
    }

    sourceEl.addEventListener(eventName, function (evt) {
      writeField(fieldName, getValue(evt), options.write);
    });
  }

  function submitNative(selector) {
    var el = window.BUI.dom.qs(selector);
    if (!el) {
      console.error('[bui-ghl-bridge] submitNative: no element matched "' + selector + '".');
      return false;
    }
    el.click();
    return true;
  }

  window.BUI.ghl = {
    hideNative: hideNative,
    writeField: writeField,
    whenFieldReady: whenFieldReady,
    bindField: bindField,
    submitNative: submitNative
  };
})();
