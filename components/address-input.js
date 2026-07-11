/*!
 * Brichaus UI Kit — <bui-address-input>
 * Depends only on core.js. Light DOM. Delete this file from a page and
 * nothing else breaks.
 *
 * A text field with a Google Places address-suggestion dropdown, styled
 * to match the kit's own design system (not Google's default widget).
 * Built on the current Autocomplete Data API
 * (google.maps.places.AutocompleteSuggestion), not the legacy
 * AutocompleteService — Google stopped offering AutocompleteService to
 * new customers as of March 1, 2025.
 *
 * IMPORTANT — this component does NOT load the Google Maps script
 * itself. The GHL merge tag that supplies your API key
 * (`{{custom_values.google_api_key}}`) only resolves inside GHL's own
 * page HTML, not inside a separately-hosted .js file like this one. Keep
 * your own Maps script tag in the GHL page (Custom Code block / header
 * tracking code), e.g.:
 *
 *   <script src="https://maps.googleapis.com/maps/api/js?key={{custom_values.google_api_key}}&libraries=places&loading=async"></script>
 *
 * This component just waits for `google.maps.importLibrary` to exist and
 * lazily imports the "places" library the first time it's needed. If the
 * Maps script never loads (missing key, network issue, page doesn't use
 * Places), the field degrades to a plain text input — no suggestions,
 * no error thrown.
 *
 * Attributes:
 *   label        default "Property Address"
 *   name         form field name
 *   placeholder  default "Enter your property address"
 *   hint         helper text
 *   error        error message; when present, field is marked invalid
 *   required     boolean
 *   disabled     boolean
 *   region       ISO region code to bias/restrict results, e.g. "us"
 *   types        comma-separated Place types to restrict to, e.g.
 *                "street_address,premise" (default: unrestricted)
 *   fields       comma-separated Place Details fields to fetch on
 *                selection (default: "formattedAddress,addressComponents,location")
 *   debounce     ms between keystroke and suggestion fetch (default 250)
 *
 * Property:
 *   .value  get/set — proxies to the internal <input>.
 *
 * Events:
 *   bui-input          — every keystroke, detail: { value }
 *   bui-change         — change/blur commit, detail: { value, fromSelection }
 *                        fromSelection is true when this fired because a
 *                        suggestion was picked (it fires before
 *                        bui-address-select below, since place details are
 *                        fetched async afterward) — false/absent for a
 *                        genuine manual edit. A consumer that needs to
 *                        treat picks and typed edits differently should
 *                        check this rather than guessing from event order.
 *   bui-address-select — a suggestion was chosen and its details fetched,
 *                        detail: { description, placeId, place } where
 *                        `place` holds whichever `fields` were requested
 *                        (e.g. place.formattedAddress, place.location,
 *                        place.addressComponents) — any field that fails
 *                        to fetch is simply absent, not an error.
 *
 * Usage:
 *   <bui-address-input
 *     label="Property Address"
 *     region="us"
 *     fields="formattedAddress,addressComponents,location">
 *   </bui-address-input>
 */
(function () {
  if (!window.BUI) {
    console.error('[bui-address-input] core.js must be loaded first.');
    return;
  }

  var STYLE_ID = 'bui-style-address-input';
  window.BUI.injectStyle(STYLE_ID, [
    'bui-address-input { display: block; }',
    'bui-address-input, bui-address-input * { box-sizing: border-box; }',
    '.bui-field { font-family: var(--bui-font-family); display: flex; flex-direction: column; gap: var(--bui-space-1); position: relative; }',
    '.bui-field__label { font-size: var(--bui-font-size-sm); font-weight: 600; color: var(--bui-color-text); }',
    '.bui-field__control-wrap {',
    '  display: flex;',
    '  align-items: stretch;',
    '  background: var(--bui-color-surface);',
    '  border: 1px solid var(--bui-color-border-strong);',
    '  border-radius: var(--bui-radius-sm);',
    '  transition: border-color var(--bui-transition-fast), box-shadow var(--bui-transition-fast);',
    '}',
    '.bui-field__control-wrap:focus-within { border-color: var(--bui-color-accent); box-shadow: var(--bui-focus-ring); }',
    '.bui-field__control-wrap[data-invalid="true"] { border-color: var(--bui-color-danger); }',
    '.bui-field__control-wrap[data-invalid="true"]:focus-within { box-shadow: var(--bui-focus-ring-danger); }',
    '.bui-field__control-wrap[data-disabled="true"] { background: var(--bui-color-bg); opacity: 0.7; }',
    '.bui-field__icon { flex: 0 0 auto; display: flex; align-items: center; padding-left: var(--bui-space-3); color: var(--bui-color-text-muted); }',
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
    '.bui-field__hint { font-size: var(--bui-font-size-sm); color: var(--bui-color-text-muted); }',
    '.bui-field__error { font-size: var(--bui-font-size-sm); color: var(--bui-color-danger); }',
    /* Clear (X) button — hidden until the field has text. */
    '.bui-field__clear {',
    '  flex: 0 0 auto;',
    '  display: none;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 26px;',
    '  height: 26px;',
    '  margin-right: 6px;',
    '  padding: 0;',
    '  border: none;',
    '  background: none;',
    '  border-radius: 50%;',
    '  cursor: pointer;',
    '  color: var(--bui-color-text-faint);',
    '  font-size: 15px;',
    '  line-height: 1;',
    '}',
    '.bui-field__clear[data-visible="true"] { display: inline-flex; }',
    '.bui-field__clear:hover { color: var(--bui-color-text); }',
    '.bui-field__clear:focus-visible { box-shadow: var(--bui-focus-ring); outline: none; }',
    '.bui-address-listbox {',
    '  position: absolute;',
    '  top: 100%;',
    '  left: 0;',
    '  right: 0;',
    '  margin-top: var(--bui-space-2);',
    '  background: var(--bui-color-surface);',
    '  border: 1px solid var(--bui-color-border);',
    '  border-radius: var(--bui-radius-md);',
    '  box-shadow: var(--bui-shadow-lg);',
    '  overflow: hidden;',
    '  z-index: 40;',
    '  display: none;',
    '}',
    '.bui-address-listbox[data-open="true"] { display: block; }',
    '.bui-address-option {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: var(--bui-space-3);',
    '  padding: var(--bui-space-3) var(--bui-space-4);',
    '  cursor: pointer;',
    '  font-size: var(--bui-font-size-md);',
    '  color: var(--bui-color-text);',
    '  border-top: 1px solid var(--bui-color-border);',
    '}',
    '.bui-address-option:first-child { border-top: none; }',
    '.bui-address-option__icon { flex: 0 0 auto; color: var(--bui-color-text-faint); }',
    '.bui-address-option[data-active="true"] { background: var(--bui-color-accent-bg); }',
    '.bui-address-option[data-active="true"] .bui-address-option__icon { color: var(--bui-color-accent); }'
  ].join('\n'));

  var PIN_ICON_SVG = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
  var OPTION_PIN_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  // Shared across every <bui-address-input> on the page — the Places
  // library only needs to be imported once, however many address fields
  // the page has.
  var placesLibraryPromise = null;

  function ensurePlacesLibrary() {
    if (placesLibraryPromise) return placesLibraryPromise;

    if (!window.google || !window.google.maps || typeof window.google.maps.importLibrary !== 'function') {
      return Promise.reject(new Error('google.maps.importLibrary is not available — is the Maps script tag present on this page?'));
    }

    placesLibraryPromise = window.google.maps.importLibrary('places').catch(function (err) {
      placesLibraryPromise = null; // allow retry on the next keystroke instead of caching a permanent failure
      throw err;
    });

    return placesLibraryPromise;
  }

  function extractText(field) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field.text === 'string') return field.text;
    if (field.text && typeof field.text.text === 'string') return field.text.text;
    if (typeof field.toString === 'function') {
      var str = field.toString();
      if (str && str !== '[object Object]') return str;
    }
    return '';
  }

  var OBSERVED = ['label', 'name', 'placeholder', 'hint', 'error', 'required', 'disabled', 'value', 'region', 'types', 'fields', 'debounce'];

  class BuiAddressInput extends HTMLElement {
    static get observedAttributes() {
      return OBSERVED;
    }

    connectedCallback() {
      if (this._buiRendered) return;
      this._buiRendered = true;

      var id = this.getAttribute('id') || window.BUI.uid('bui-address');
      var hintId = id + '-hint';
      var errorId = id + '-error';
      var listboxId = id + '-listbox';

      this.innerHTML = '';

      var wrap = document.createElement('div');
      wrap.className = 'bui-field';

      var label = document.createElement('label');
      label.className = 'bui-field__label';
      label.setAttribute('for', id);

      var controlWrap = document.createElement('div');
      controlWrap.className = 'bui-field__control-wrap';

      var icon = document.createElement('span');
      icon.className = 'bui-field__icon';
      icon.innerHTML = PIN_ICON_SVG;
      icon.setAttribute('aria-hidden', 'true');

      var input = document.createElement('input');
      input.className = 'bui-field__control';
      input.id = id;
      input.type = 'text';
      input.autocomplete = 'off';
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', listboxId);

      var hint = document.createElement('div');
      hint.className = 'bui-field__hint';
      hint.id = hintId;

      var error = document.createElement('div');
      error.className = 'bui-field__error';
      error.id = errorId;
      error.setAttribute('role', 'alert');

      var listbox = document.createElement('div');
      listbox.className = 'bui-address-listbox';
      listbox.id = listboxId;
      listbox.setAttribute('role', 'listbox');

      // Clear (X) control — appears once the field has any text; clicking
      // it empties the field and reports the wipe through the exact same
      // bui-input/bui-change events manual deletion would fire, so
      // consumers need no special handling for it.
      var clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'bui-field__clear';
      clearBtn.setAttribute('aria-label', 'Clear address');
      clearBtn.innerHTML = '&#10005;';
      // preventDefault on mousedown keeps focus in the input, so the
      // browser never fires the native blur 'change' mid-clear.
      clearBtn.addEventListener('mousedown', function (evt) { evt.preventDefault(); });
      clearBtn.addEventListener('click', () => this._clear());

      controlWrap.appendChild(icon);
      controlWrap.appendChild(input);
      controlWrap.appendChild(clearBtn);

      wrap.appendChild(label);
      wrap.appendChild(controlWrap);
      wrap.appendChild(listbox);
      wrap.appendChild(hint);
      wrap.appendChild(error);
      this.appendChild(wrap);

      this._input = input;
      this._clearBtn = clearBtn;
      this._label = label;
      this._hint = hint;
      this._error = error;
      this._controlWrap = controlWrap;
      this._listbox = listbox;
      this._suggestions = [];
      this._activeIndex = -1;
      this._sessionToken = null;
      this._debounceTimer = null;
      this._lastRequestId = 0;

      input.addEventListener('input', () => {
        // Any real keystroke means the visitor is editing past whatever
        // was last picked — clears the flag below so a later blur is
        // reported as a genuine edit, not folded back into the selection.
        this._suppressNextChange = false;
        this._syncClear();
        window.BUI.dispatch(this, 'bui-input', { value: input.value });
        this._scheduleSearch();
      });

      input.addEventListener('change', () => {
        // Typing to search already dirtied the input relative to its
        // focus-time value, so once _selectSuggestion() overwrites .value
        // with the picked description (while focus stays put — the
        // option's mousedown calls preventDefault to keep it there), the
        // browser still owes this field a native 'change' of its own on
        // the next blur. That can land well after the synchronous
        // fromSelection:true dispatch _selectSuggestion() already sent.
        // Without carrying the flag through, that later blur-triggered
        // change read as a fresh manual edit and wiped out the very
        // selection that produced it — confirmed live: pick a suggestion,
        // then click Continue (which blurs this field), and the "choose
        // from suggestions" error would reappear despite the selection.
        var fromSelection = this._suppressNextChange;
        this._suppressNextChange = false;
        window.BUI.dispatch(this, 'bui-change', { value: input.value, fromSelection: fromSelection });
      });

      input.addEventListener('keydown', (evt) => this._onKeydown(evt));

      this._onDocumentClick = (evt) => {
        if (!this.contains(evt.target)) this._closeListbox();
      };
      document.addEventListener('click', this._onDocumentClick);

      this._syncAttrs();
    }

    disconnectedCallback() {
      document.removeEventListener('click', this._onDocumentClick);
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this._buiRendered) return;
      if (name === 'value' && this._input.value !== newVal) {
        this._input.value = newVal || '';
        this._syncClear();
        return;
      }
      this._syncAttrs();
    }

    _syncClear() {
      this._clearBtn.dataset.visible = this._input.value ? 'true' : 'false';
    }

    _clear() {
      this._input.value = '';
      this._suppressNextChange = false;
      this._closeListbox();
      this._syncClear();
      // Same event pair a manual select-all + delete would produce.
      window.BUI.dispatch(this, 'bui-input', { value: '' });
      window.BUI.dispatch(this, 'bui-change', { value: '', fromSelection: false });
      this._input.focus();
    }

    _syncAttrs() {
      var input = this._input;
      var id = input.id;
      var hintId = id + '-hint';
      var errorId = id + '-error';

      this._label.textContent = this.getAttribute('label') || 'Property Address';

      input.name = this.getAttribute('name') || '';
      input.placeholder = this.getAttribute('placeholder') || 'Enter your property address';
      if (this.hasAttribute('value') && input.value === '') input.value = this.getAttribute('value');
      input.required = this.hasAttribute('required');
      input.disabled = this.hasAttribute('disabled');
      this._controlWrap.dataset.disabled = this.hasAttribute('disabled') ? 'true' : 'false';

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

    _scheduleSearch() {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      var delay = parseInt(this.getAttribute('debounce'), 10) || 250;
      this._debounceTimer = setTimeout(() => this._search(), delay);
    }

    _search() {
      var query = this._input.value.trim();
      if (!query) {
        this._closeListbox();
        return;
      }

      var requestId = ++this._lastRequestId;

      ensurePlacesLibrary()
        .then((placesLib) => {
          if (requestId !== this._lastRequestId) return; // stale response, a newer keystroke superseded it
          if (!this._sessionToken) this._sessionToken = new placesLib.AutocompleteSessionToken();

          var request = { input: query, sessionToken: this._sessionToken };

          var region = this.getAttribute('region');
          if (region) request.region = region;

          var types = this.getAttribute('types');
          if (types) request.includedPrimaryTypes = types.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

          return placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        })
        .then((result) => {
          if (!result || requestId !== this._lastRequestId) return;
          this._renderSuggestions(result.suggestions || []);
        })
        .catch(() => {
          // No Maps script, no API key, network hiccup, etc. — degrade to
          // a plain text field rather than surfacing an error to the user.
          this._closeListbox();
        });
    }

    _renderSuggestions(suggestions) {
      this._suggestions = suggestions;
      this._activeIndex = -1;
      var listbox = this._listbox;
      listbox.innerHTML = '';

      if (suggestions.length === 0) {
        this._closeListbox();
        return;
      }

      suggestions.forEach((suggestion, i) => {
        var prediction = suggestion.placePrediction;
        var text = extractText(prediction && prediction.text) || extractText(prediction);

        var option = document.createElement('div');
        option.className = 'bui-address-option';
        option.id = this._input.getAttribute('aria-controls') + '-option-' + i;
        option.setAttribute('role', 'option');
        option.dataset.index = String(i);

        var optIcon = document.createElement('span');
        optIcon.className = 'bui-address-option__icon';
        optIcon.innerHTML = OPTION_PIN_SVG;
        optIcon.setAttribute('aria-hidden', 'true');

        var optText = document.createElement('span');
        optText.textContent = text;

        option.appendChild(optIcon);
        option.appendChild(optText);

        option.addEventListener('mouseenter', () => this._setActive(i));
        option.addEventListener('mousedown', (evt) => {
          evt.preventDefault(); // keep focus in the input through the click
          this._selectSuggestion(i);
        });

        listbox.appendChild(option);
      });

      this._openListbox();
    }

    _openListbox() {
      this._listbox.dataset.open = 'true';
      this._input.setAttribute('aria-expanded', 'true');
    }

    _closeListbox() {
      this._listbox.dataset.open = 'false';
      this._input.setAttribute('aria-expanded', 'false');
      this._input.removeAttribute('aria-activedescendant');
      this._activeIndex = -1;
    }

    _setActive(index) {
      var options = window.BUI.dom.qsa('.bui-address-option', this._listbox);
      options.forEach(function (opt) { opt.dataset.active = 'false'; });
      this._activeIndex = index;
      if (index >= 0 && options[index]) {
        options[index].dataset.active = 'true';
        this._input.setAttribute('aria-activedescendant', options[index].id);
      } else {
        this._input.removeAttribute('aria-activedescendant');
      }
    }

    _onKeydown(evt) {
      var isOpen = this._listbox.dataset.open === 'true';

      if (evt.key === 'ArrowDown') {
        evt.preventDefault();
        if (!isOpen) return;
        this._setActive(Math.min(this._suggestions.length - 1, this._activeIndex + 1));
      } else if (evt.key === 'ArrowUp') {
        evt.preventDefault();
        if (!isOpen) return;
        this._setActive(Math.max(0, this._activeIndex - 1));
      } else if (evt.key === 'Enter') {
        if (!isOpen) return;
        evt.preventDefault();
        // No arrow-key highlight yet (the common case — visitor just typed
        // and hit Enter without ever pressing an arrow key) falls back to
        // the top suggestion, matching how most address autocompletes treat
        // a bare Enter.
        this._selectSuggestion(this._activeIndex === -1 ? 0 : this._activeIndex);
      } else if (evt.key === 'Escape') {
        if (!isOpen) return;
        evt.preventDefault();
        this._closeListbox();
      }
    }

    _selectSuggestion(index) {
      var suggestion = this._suggestions[index];
      if (!suggestion) return;

      var prediction = suggestion.placePrediction;
      var description = extractText(prediction && prediction.text) || extractText(prediction);

      this._input.value = description;
      this._syncClear();
      // The native 'change' listener above will still fire on its own
      // once this field blurs (setting .value while focused leaves the
      // browser's own dirty-tracking primed) — mark that upcoming event
      // as part of this same selection so it doesn't get read as a
      // manual edit. See the comment on that listener for the full story.
      this._suppressNextChange = true;
      this._closeListbox();
      // fromSelection: true — this fires before bui-address-select (place
      // details are fetched async, after this), so a consumer that needs
      // to tell "the visitor picked a suggestion" apart from "the visitor
      // typed/edited the text directly" can't rely on ordering or a
      // string-equality guess against still-stale state. Existing
      // consumers that only look at detail.value are unaffected.
      window.BUI.dispatch(this, 'bui-change', { value: description, fromSelection: true });

      var fieldsAttr = this.getAttribute('fields') || 'formattedAddress,addressComponents,location';
      var fieldList = fieldsAttr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

      var placeId = prediction && prediction.placeId;
      var sessionToken = this._sessionToken;
      this._sessionToken = null; // this search session is complete once details are requested

      if (!prediction || typeof prediction.toPlace !== 'function') {
        window.BUI.dispatch(this, 'bui-address-select', { description: description, placeId: placeId, place: {} });
        return;
      }

      var place = prediction.toPlace();
      place
        .fetchFields({ fields: fieldList, sessionToken: sessionToken })
        .then(() => {
          var result = {};
          fieldList.forEach(function (field) {
            if (place[field] !== undefined) result[field] = place[field];
          });
          window.BUI.dispatch(this, 'bui-address-select', { description: description, placeId: placeId, place: result });
        })
        .catch(() => {
          window.BUI.dispatch(this, 'bui-address-select', { description: description, placeId: placeId, place: {} });
        });
    }

    get value() {
      return this._input ? this._input.value : this.getAttribute('value') || '';
    }

    set value(val) {
      if (this._input) {
        this._input.value = val;
        this._syncClear();
      } else {
        this.setAttribute('value', val);
      }
    }
  }

  window.BUI.registerComponent('bui-address-input', BuiAddressInput);
})();
