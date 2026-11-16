# Changelog

One line per release. GHL embeds reference these tags.

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
