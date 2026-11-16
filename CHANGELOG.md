# Changelog

One line per release. GHL embeds reference these tags.

## v1.2.0
- Pricing rule: Track One per-unit rate steps down with scale; Track Two never does (management hours rise with every door). Console warning if config breaks it.
- HOA Track Two repriced: $650 minimum now covers 10 units (was 24), matching Track One. $12.75 per unit for units 11–24 (19 units = $765), flat $16 from unit 25. 11–59 units rise; 60+ units drop 2–6% vs v1.1.0.
- Fee copy states the rule for each track.
- Calculator rate line now names the band, e.g. "$16 per unit for units 25–200".

## v1.1.0
- Add `app/hoa-pricing/` — HOA scope ledger, fee calculator, and schedule of fees moved out of GHL into the repo. All prices now in `config.js`.
- HOA calculator range label now reads from config ("4 — 200 units · larger communities by proposal"); previous "200+" label was unreachable.

## v1.0.0
- Initial public release of the UI kit.
