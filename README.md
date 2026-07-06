# Brichaus UI Kit

A dependency-free component kit for Brichaus Group's GoHighLevel-hosted
funnels, landing pages, and portals. Every file is a plain `<script>`
include — no bundler, no npm install, nothing to build. Copy files into a
GHL embed and they work.

## What's in here

```
/ui-kit
  /core
    core.js              — load this in full, on every page, always
  /components
    button.js
    input.js              — also handles prefix/suffix affixes (currency, icon)
    select.js
    modal.js
    card.js               — elevated/outlined/flat/tinted/info variants
    stepper.js
    score-gauge.js        — numeric ring gauge
    alert.js              — also exposes BUI.toast()
    progress-bar.js       — linear header bar, segmented counter, continuous track
    choice-card.js        — bui-choice-group + bui-choice-card (driver-selection cards)
    dial-gauge.js         — semicircular needle gauge, categorical readout
    loading.js            — bui-spinner, bui-skeleton, bui-dots, bui-checklist
    address-input.js      — Google Places address autocomplete, own styled dropdown
  /integrations
    ghl-bridge.js         — GHL-specific field sync; not part of the portability
                            contract below, load only where you need it
  /examples
    example-page.html     — minimal 3-component demo, opens directly in a browser
    funnel-example.html   — fuller "Property Intelligence Report" funnel step
  README.md
```

## The include pattern

Every page loads `core.js`, then only the component files that page
actually uses:

```html
<script src="/core/core.js"></script>
<script src="/components/button.js"></script>
<script src="/components/modal.js"></script>
```

That's it. There's no manifest, no registry to update, no import graph to
keep in sync. Rules that make this safe:

- **`core.js` is the only shared dependency.** It defines the design
  tokens, a component-registration guard, DOM helpers, an event bus, and
  a tiny state store. Nothing else in the kit depends on anything but
  `core.js`.
- **Every component file is self-contained.** Markup, scoped styles, and
  behavior all live in one file. A component never reaches into another
  component's internals.
- **Deleting a component's `<script>` tag never breaks anything else.**
  If a page stops using `<bui-modal>`, remove `modal.js` and nothing
  else on the page is affected.
- **Order doesn't matter beyond `core.js` going first.** Component files
  can load in any order relative to each other.
- **Double-loading is safe.** GHL duplicates embedded sections sometimes,
  which can cause a `<script>` tag to load twice on one page. Every
  component calls `BUI.registerComponent()` instead of
  `customElements.define()` directly, and every stylesheet injection is
  guarded by an `id` check — a component script running twice is a
  no-op the second time, not a thrown error.

## Adding a new component

1. Create `/components/my-thing.js`.
2. Guard against `core.js` missing:
   ```js
   (function () {
     if (!window.BUI) {
       console.error('[bui-my-thing] core.js must be loaded first.');
       return;
     }
     // ...
   })();
   ```
3. Inject your stylesheet once, guarded by a unique id:
   ```js
   window.BUI.injectStyle('bui-style-my-thing', `
     bui-my-thing { display: block; }
     bui-my-thing, bui-my-thing * { box-sizing: border-box; }
     .bui-my-thing { font-family: var(--bui-font-family); /* ... */ }
   `);
   ```
4. Define the element as a `class extends HTMLElement`, render into
   **light DOM** (`this.appendChild(...)`, never `attachShadow`), and
   register it through core, not `customElements.define` directly:
   ```js
   class BuiMyThing extends HTMLElement {
     connectedCallback() { /* render once, guarded by this._buiRendered */ }
   }
   window.BUI.registerComponent('bui-my-thing', BuiMyThing);
   ```
5. Keep CSS specificity low inside your component: tag-name selector for
   the host element, single classes for everything else, no IDs, no
   `!important`. See "CSS specificity" below.
6. Read tokens (`var(--bui-color-accent)`, etc.) instead of hardcoding
   colors, so the component follows per-project overrides automatically.
7. If your component animates anything, gate it behind
   `@media (prefers-reduced-motion: no-preference)` (see `modal.js` and
   `score-gauge.js` for the pattern), and/or check
   `BUI.prefersReducedMotion()` in JS before starting a transition.

Copy this file plus `core.js` into any other project's `/ui-kit` folder
and it works immediately — that's the portability test every component
should pass.

## Overriding design tokens per project

Tokens are CSS custom properties `core.js` writes onto `:root`. Two ways
to override them, in increasing order of control:

**CSS (simplest, per-project or per-page).** Add a `<style>` block
*after* `core.js`'s `<script>` tag — a later `:root` rule with the same
variable wins the cascade tie-break:

```html
<script src="/core/core.js"></script>
<style>
  :root {
    --bui-color-accent: #2C4A9C;
    --bui-color-bg: #F4F4F2;
  }
</style>
```

**JavaScript (before `core.js` loads).** Set `window.BUI_TOKENS` first;
`core.js` merges it over the defaults before injecting the `<style>`
tag. Useful when the token values come from something dynamic (a GHL
custom field, a query param, a client's brand config object):

```html
<script>
  window.BUI_TOKENS = { '--bui-color-accent': '#2C4A9C' };
</script>
<script src="/core/core.js"></script>
```

Any `--bui-*` variable defined in `core/core.js`'s `DEFAULT_TOKENS`
object can be overridden this way — colors, spacing, radii, shadows,
transitions, the font stack, all of it.

## Design tokens (current defaults)

Superseded by a fuller reference document (a "GHL Form Kit" style guide
for a Property Intelligence Report funnel) partway through this kit's
build. Tokens below reflect that second pass — the palette and shadow
tint changed; the font and the charcoal text/dark-surface color were
kept from the original brand pass rather than replaced.

| Token | Value | Notes |
|---|---|---|
| `--bui-font-family` | Montserrat, system fallback stack | Kept from the original brand pass — the reference doc's Source Serif 4 / Libre Franklin pairing was not adopted |
| `--bui-color-accent` | `#C08A2E` (Gold) | Conversion-moment CTAs only ("Generate My Report," "Schedule Consultation") |
| `--bui-color-accent-light` | `#E0A94A` | Gradient endpoint paired with accent (header progress bar, hero glow) |
| `--bui-color-accent-bg` / `-bg-border` | `#F4EAE6` / `#E4D3CB` | Blush tint — tinted card callouts, selected choice-card background |
| `--bui-color-slate` | `#4A5A72` | Forward-navigation default ("Continue" buttons, step-header bars) — distinct from the Gold conversion accent |
| `--bui-color-slate-light` | `#6E8299` | Gradient endpoint paired with slate (continuous progress tracks) |
| `--bui-color-surface-dark` | `#211E1C` | Warm charcoal — kept from the original brand pass, still the text color |
| `--bui-color-bg` | `#F4F5F7` | Neutral off-white, updated to the reference doc's exact "Surface" value |
| `--bui-color-danger` | `#9C3F2C` (Brick) | Was the kit's original accent; demoted to the error/high-intensity semantic color — this is an intentional swap, not a mistake |
| `--bui-color-warning` | `#B5631E` (Amber-derived) | Mid-tier/moderate-intensity states |
| `--bui-color-success` / `-info` | see `core.js` | Unchanged / aligned to slate |
| `--bui-radius-lg` | `14px` | Bumped up from `8px` to match the doc's card corner radius |
| `--bui-radius-pill` | `999px` | New — pill badges, segmented progress |

Full list, including spacing/font-size/shadow/transition scales, is in
`core/core.js` under `DEFAULT_TOKENS`. If a real brichausgroup.com
stylesheet ever surfaces, reconcile against that rather than either of
these two passes.

## Component reference

All components are light-DOM custom elements, kebab-case, namespaced
`bui-*`. Full attribute/event lists are documented as a comment at the
top of each component file — this is the short version.

- **`<bui-button>`** — `variant` (primary/slate/secondary/ghost/danger),
  `size`, `disabled`, `full-width`, `type`. Fires `bui-click`. `primary`
  is Gold and reserved for conversion moments; `slate` is the default
  forward-navigation ("Continue") button.
- **`<bui-input>`** — `label`, `type`, `hint`, `error`, `required`,
  `disabled`, `prefix`/`suffix` (text affix, e.g. `prefix="$"`), a
  `slot="prefix-icon"` child for an icon affix (search/pin icon fields),
  `.value`. Fires `bui-input` / `bui-change`.
- **`<bui-select>`** — same field chrome as input; accepts light-DOM
  `<option>`/`<optgroup>` children. Fires `bui-change`.
- **`<bui-modal>`** — `open` (reflected), `label`, `no-backdrop-close`;
  `slot="title"` / `slot="footer"`. `.show()` / `.hide()` / `.toggle()`.
  Focus-trapped, Escape-to-close, scroll-locked, focus-restored on
  close. Fires `bui-open` / `bui-close`.
- **`<bui-card>`** — `variant` (elevated/outlined/flat/tinted/info),
  `padding`; `slot="header"` / `slot="footer"`. `tinted` (blush) is for
  highlighted insight callouts; `info` is the neutral secondary-context
  card.
- **`<bui-stepper>`** — `steps` (comma-separated labels), `current`
  (1-based), `allow-nav`. Presentational; host owns validation and
  advances `current`. Fires `bui-step-change` when nav-enabled steps
  are clicked.
- **`<bui-progress-bar>`** — `variant` (linear/segmented), `tone`
  (card/header), `value`, `max`, `label`, `show-value`. Covers the
  step-header progress bar (`tone="header"`), a segmented sub-step
  counter (`variant="segmented"`), and a continuous loading track
  (`variant="linear" tone="card"`) with one component.
- **`<bui-choice-group>` / `<bui-choice-card>`** — single-select
  "driver" cards (ARIA radiogroup: arrow keys move + select, Enter/Space
  selects). Group: `name`, `value` (get/set). Card: `value`, `label`,
  `description`, `meta` (trailing stat like `"1.5x"`), `meta-tone`
  (accent/slate/warning/danger), `disabled`, `slot="icon"`. Group fires
  `bui-change` with `{ name, value }`.
- **`<bui-score-gauge>`** — `value`, `max`, `label`, `size`, `tone`
  (auto/accent/success/warning/danger). A full-circle ring gauge for a
  numeric score. Presentational; feed it a computed score.
- **`<bui-dial-gauge>`** — `value` (0–100 needle position), `eyebrow`,
  `readout` (large categorical label, e.g. `"HIGH"`), `caption`,
  `readout-tone`. A semicircular needle gauge with four color bands, for
  a categorical result rather than a numeric one — use this or
  `bui-score-gauge`, not both, depending on whether the result reads as
  a number or a category.
- **`<bui-alert>`** — `variant` (info/success/warning/danger),
  `dismissible`, `duration` (auto-dismiss ms). Also exposes
  `BUI.toast(message, { variant, duration, dismissible })` for
  transient stacked toasts — reuses the same element and stylesheet.
- **`<bui-address-input>`** — `label`, `region`, `types`, `fields`,
  `debounce`, plus the same `hint`/`error`/`required`/`disabled`/`.value`
  field chrome as `bui-input`. A Google Places address field with its own
  brand-styled suggestions dropdown (not Google's default widget). Fires
  `bui-input` / `bui-change` like `bui-input`, plus
  `bui-address-select` with `{ description, placeId, place }` once a
  suggestion is chosen and its details are fetched. See "Google Places
  in GHL" below before wiring this one up — it has a real external
  dependency the rest of the kit doesn't.
- **`<bui-spinner>` / `<bui-skeleton>` / `<bui-dots>` / `<bui-checklist>`**
  (all in `loading.js`) — `bui-spinner` (`size`, `tone`): inline SVG
  spinner. `bui-skeleton` (`width`, `height`): one shimmer bar per
  element, stack a few for a multi-line placeholder. `bui-dots`
  (`tone`): three pulsing dots for between-step transitions.
  `bui-checklist` (`items` comma-separated, `current` 1-based):
  sequential "finalizing your report" list — items before `current` get
  a checkmark, the current item gets a spinner, later items stay dim.

### Composition over new components

Two things in the reference doc — the "step shell" (header bar + card +
centered intro) and the "results card" (report header + stat grid +
insights list + actions) — are **not** separate components. They're
compositions of primitives already listed above: a step shell is a
`bui-card` with a `bui-progress-bar[tone="header"]` placed before it (or
as its `slot="header"`), and a results card is a `bui-card` containing
plain markup, a `bui-dial-gauge`/`bui-score-gauge`, and `bui-button`s.
See `examples/funnel-example.html` for both, built entirely from
existing primitives — that's deliberate: a one-off "step shell
component" would just be a card and a progress bar glued together with
no reuse value of its own, which cuts against keeping prop APIs simple
and composable.

## Google Places in GHL — the one component with an external dependency

`bui-address-input` is the only component in this kit that talks to
anything outside the page. Two things make it different from every
other file here:

**It does not load the Google Maps script itself.** GHL supplies your
API key via a merge tag (`{{custom_values.google_api_key}}`) that only
resolves inside GHL's own page HTML at render time — it cannot resolve
inside a separately-hosted `.js` file, which is what every file in
`/components` is. So the Maps script tag has to stay as your own inline
code in the GHL page (a Custom Code block or header tracking code), not
move into the kit:

```html
<script src="https://maps.googleapis.com/maps/api/js?key={{custom_values.google_api_key}}&libraries=places&loading=async"></script>
```

`address-input.js` just waits for `google.maps.importLibrary` to exist
and lazily imports the `"places"` library the first time a user types
into the field. Load order between that script tag and `address-input.js`
doesn't matter — whichever loads first, the other one waits.

**It degrades gracefully if Places never loads.** No API key, a typo in
the merge tag, the script tag missing from that page entirely — the
field just behaves like a plain text input with no suggestions. Nothing
throws, nothing blocks the rest of the page.

**It's built on the current Autocomplete Data API, not the deprecated
one.** Google stopped offering `google.maps.places.AutocompleteService`
to new customers as of March 1, 2025. This component uses
`google.maps.places.AutocompleteSuggestion` instead (accessed via
`google.maps.importLibrary('places')`), with a session token per search
so autocomplete + place-details calls bill as one session rather than
two separate charges. If you have an older GHL snippet anywhere that
still references `AutocompleteService` or embeds Google's own
`PlaceAutocompleteElement` widget, that's unrelated to this component —
don't wire it in alongside this one, they'd conflict.

## GHL field sync — the other GHL-specific file

`integrations/ghl-bridge.js` is the second file in this kit (alongside
`address-input.js`'s Google Places dependency) that isn't part of the
"copy into any project" portability contract above — it exists
specifically to get a `bui-*` component's value into a real GoHighLevel
field. GHL only submits its own tracked native fields and blocks
arbitrary custom-field data by default, so any `bui-*` component
replacing or supplementing a native field needs its value mirrored back
into that field.

`ghl-bridge.js` wraps the pattern this required in practice: find the
native field by `name`, hide it off-screen (never `display:none`, which
GHL's own visibility/conditional-logic handling can exclude from a
submission), write `.value` twice with a short delay between writes
(GHL's own re-render can occasionally lose a single write), and dispatch
`input`/`change` after each so GHL's own listeners see it. See the
comment header in the file for the full API — `hideNative`, `writeField`,
`whenFieldReady`, `bindField` — and usage examples.

Load it only on pages that actually talk to GHL fields, same rule as
every other file here: load what a page uses, nothing more.

## Why Custom Elements + light DOM (and not something else)

- **Custom Elements (Web Components v1)** are natively supported in
  every evergreen browser, need zero runtime or polyfill, and are the
  only mechanism that gives us a real, portable "component" unit
  (encapsulated markup + styles + behavior, registered once, reusable
  via a plain HTML tag) without a build step. A React/Vue/Svelte
  component isn't usable as a raw `<script>` include; a Custom Element
  is exactly that by design.
- **Light DOM instead of Shadow DOM** is the more unusual choice and
  worth calling out: Shadow DOM would give style isolation "for free,"
  but GHL pages already carry the client's fonts, headings, and body
  copy styling, and the brief for this kit is that components should
  *inherit* that, not fight it in a fully isolated shadow tree. Light
  DOM also means the host page's own CSS, GHL section builder styles,
  and things like print stylesheets or accessibility overlays all keep
  working against the kit's markup without needing `::part()` /
  `::slotted()` workarounds. The tradeoff is that we own CSS
  specificity discipline ourselves instead of getting it from shadow
  boundaries — see below.
- **No shared registry / manifest** was deliberately left out. A
  registry is one more thing to keep in sync across pages and one more
  thing that can drift when a component is deleted from one page but
  not the registry. `BUI.registerComponent()`'s only job is the
  double-define guard; discovery is just "which `<script>` tags are on
  this page," which is also the mental model GHL section editors
  already have.

## CSS specificity — the thing to watch

Because there's no Shadow DOM boundary, token-level rules (on `:root`)
and component-level rules (scoped by tag name + single classes) share
one global cascade with the host page. The convention every component
in this kit follows, and that new components should follow too:

- The custom element tag itself (`bui-button`, `bui-modal`, …) only
  ever gets a bare tag selector, and only for host-level `display`.
  Specificity: `(0,0,1)`.
- Everything inside is a single class, one level deep off the tag
  (`.bui-btn`, `.bui-field__control`, …). Never `.bui-btn.bui-btn` or
  `#some-id`. Specificity: `(0,1,0)`.
- State/variant modifiers use `data-*` attribute selectors chained onto
  that one class (`.bui-btn[data-variant="danger"]`), not a second
  class. Specificity: `(0,2,0)` — still low, and it composes instead of
  fighting the base class rule for the same property.
- Nothing uses `!important`, and nothing nests more than two class/attr
  selectors deep. If a future component needs to zero out a selector's
  contribution (e.g. a reset that must never outrank a consumer
  override), reach for `:where(...)` rather than adding more specific
  overrides on top.

Two component stylesheets never collide on the same selector because
each one is scoped by that component's own tag name and BEM-ish class
prefix (`.bui-field__*` only appears inside `input.js`/`select.js`,
`.bui-modal__*` only inside `modal.js`). The one shared surface is the
token layer on `:root`, which is additive by design — components read
tokens, they don't redeclare them.

## Accessibility & standards baked in

- Keyboard operable throughout: buttons are real `<button>`s, fields
  are real `<input>`/`<select>`, the modal traps Tab/Shift+Tab and
  closes on Escape.
- Correct ARIA: `aria-invalid`/`aria-describedby` on fields with
  hints/errors, `role="dialog"`/`aria-modal` on the modal,
  `role="alert"`/`role="status"` + `aria-live` on alerts/toasts by
  severity, `aria-current="step"` on the active stepper step,
  `role="img"` + computed `aria-label` on the score gauge.
- Focus management: the modal saves and restores the triggering
  element's focus and moves focus into the dialog on open.
- `prefers-reduced-motion` is respected everywhere something animates
  (modal open/close, toast enter, gauge arc fill) — reduced-motion
  users get the end state with no transition rather than a suppressed
  or broken one.
- Evergreen browsers only: no polyfills, no legacy fallback, native
  `class extends HTMLElement` throughout.

## Running the examples

Both open directly in a browser — double-click, or `open
examples/<file>.html` from a terminal. No server, no build.

- **`example-page.html`** — the minimal case: `core.js` plus `button.js`,
  `input.js`, and `score-gauge.js`, demonstrating a tiny "Portfolio
  Readiness Check" quiz snippet. It also deliberately loads `core.js` a
  second time to demonstrate that the duplicate-embed guard doesn't
  break anything.
- **`funnel-example.html`** — a fuller step from the "Property
  Intelligence Report" funnel this second design pass targets: a step
  shell (`bui-card` + `bui-progress-bar[tone="header"]`), a currency
  `bui-input`, a `bui-choice-group` of driver cards, a `bui-dial-gauge`
  result, and a `bui-checklist` loading sequence — composed entirely
  from the components above, loading only the dozen or so files that
  page actually uses.
