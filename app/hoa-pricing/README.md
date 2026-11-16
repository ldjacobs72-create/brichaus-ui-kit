# HOA Pricing module

Scope ledger, fee calculator, and schedule of fees for the Brichaus HOA
management page on GHL.

## Files

| File | What it holds | Edit when |
|---|---|---|
| `config.js` | **All prices**, unit range, schedule of fees, responsibility ledger | Pricing or scope changes |
| `hoa-pricing.js` | Calculator logic and rendering | Rarely — behavior changes only |
| `hoa-pricing.css` | Styling | Visual changes |
| `embed.html` | Page copy + the 3 CDN links. Paste into GHL | Wording changes |

Prices appear in **one place only**. The onboarding fee in the Schedule of
Fees table is pulled from `model.fin.setup` / `model.full.setup`, so it
can't drift from the calculator.

## Pricing model

Marginal-rate: `base` covers the first `cover` units; each unit above is
billed at the rate of the step it falls in; result rounded to nearest $5.
Fee never decreases as units increase. Above the last step → "By proposal".

**Pricing rule:**
- **Track One (Accounting):** per-unit rate steps down with scale.
- **Track Two (Full Service):** per-unit rate never steps down, because
  management hours rise with every door. Per-door cost still falls as the
  base spreads over more units. Published to 120 units; above that,
  amenities and complexity drive hours more than unit count, so it's
  quoted by proposal.

The browser console warns if `config.js` breaks either rule.

## Changing a price

1. Edit `config.js` on GitHub (pencil icon) → commit with a clear note.
2. **Releases → Draft a new release** → new tag (e.g. `v1.3.0`) → Publish.
3. In GHL, open the Custom HTML element and change `@v1.2.0` to `@v1.3.0`
   in all 3 URLs. Save and publish the page.
4. Add a line to `/CHANGELOG.md`.

Test before step 3: open
`https://cdn.jsdelivr.net/gh/ldjacobs72-create/brichaus-ui-kit@v1.3.0/app/hoa-pricing/config.js`
and confirm it shows your change.

## Changing page copy

Edit `embed.html` here first, then paste the whole file into GHL. Keeps
GitHub as the record of what's live.

## Notes

- Safe if GHL loads the scripts twice.
- `BH_HOA_PRICE('fin', 50)` in the browser console returns the quote for
  50 units — quick check after a pricing change.
- Prepay discount (5%) and term language are copy in `embed.html`, not
  calculated.
