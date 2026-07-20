# PropScore webhook key — intake-v2.html tracking snippet

`app/intake-v2.html`'s inline custom-code block does **not** get GHL's merge-tag
interpolation applied (confirmed live — a `{{custom_values...}}` placeholder ships
there as literal text, unlike `app/proposal.html`, where the same pattern works).
So intake-v2 reads the PropScore webhook shared-secret header from a global variable
set by a small snippet in the page's own **GHL Tracking Code** (header) instead,
which does get interpolated.

## Snippet to paste into intake-v2's page Tracking Code (header)

```html
<script>
window.__PROPSCORE_WEBHOOK_KEY__ = '{{ custom_values.propscore_webhook_key }}';
</script>
```

Paste this in GHL wherever the "tracking header" script was added previously for
this same page (Settings → Tracking Code, or the page/funnel's own tracking-code
field — same mechanism, different snippet).

## Verifying it worked

View-source the live page and search for `__PROPSCORE_WEBHOOK_KEY__`. If the
tracking snippet rendered correctly, you'll see the real secret value in place of
`{{ custom_values.propscore_webhook_key }}`. If it still shows the literal
placeholder, the custom value isn't resolving there either — check the exact
custom value name/key in GHL Settings → Custom Values.

If the snippet is absent entirely, or the custom value is unset, intake-v2.html's
`CONFIG.WEBHOOK_AUTH_HEADER_VALUE` falls back to an empty string and no auth header
is sent at all — this fails open (matches today's unauthenticated webhooks), it
does not break the page.

`app/proposal.html` is unaffected by any of this — it reads
`{{custom_values.propscore_webhook_key}}` directly inline, which already works
there.
