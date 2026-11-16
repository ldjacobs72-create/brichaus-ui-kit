# Changelog

One line per release. GHL embeds reference these tags.

## Unreleased
- intake-v2: rent per unit must be $300–$50,000 and units a whole number from 2 to 50 before Continue enables (Property Type, Snapshot and Review steps). Over 50 units shows a "priced on a call" notice with a Schedule a meeting link instead of pricing online. Limits live in `CONFIG` (`MIN_UNITS`, `MAX_UNITS`, `MIN_RENT`, `MAX_RENT`).
- intake-v2: removed the placeholder fee entirely (band-based fallback and demo mode). A failed call, an error response, or a response without a real computed fee now shows an "unavailable" step with Try Again and Book a Call — never a number.
- Power Pages web templates pinned to `@v1.2.0` (were `@main`). No code change: kit files identical. Local dev server now rewrites any pinned version.
- README rewritten at the top: real repo map, CDN/version rules, release steps, pin table.

## v1.2.0
- Pricing rule: Track One per-unit rate steps down with scale; Track Two never does (management hours rise with every door). Console warning if config breaks it.
- HOA Track Two repriced: $650 covers the first 10 units (was 24), matching Track One; $16 per unit after that (19 units = $795). Published to 120 units; 121+ by proposal.
- Fee copy states the rule for each track and the 120-unit limit.
- Calculator rate line now names the band, e.g. "$16 per unit for units 11–120".

## v1.1.0
- Add `app/hoa-pricing/` — HOA scope ledger, fee calculator, and schedule of fees moved out of GHL into the repo. All prices now in `config.js`.
- HOA calculator range label now reads from config ("4 — 200 units · larger communities by proposal"); previous "200+" label was unreachable.

## v1.0.0
- Initial public release of the UI kit.
